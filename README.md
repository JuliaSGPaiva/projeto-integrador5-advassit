# AdvAssist — Triagem Inteligente de Casos Trabalhistas com IA e RAG

**AdvAssist** é uma plataforma desenvolvida para automatizar e otimizar a triagem inicial de demandas trabalhistas. Utilizando **Inteligência Artificial (LLM)** integrada a **RAG (Retrieval-Augmented Generation)** sobre a CLT e Súmulas do TST, o sistema coleta o relato do cliente, realiza perguntas dinâmicas de esclarecimento quando necessário e entrega ao advogado um resumo jurídico estruturado com enquadramento legal e próximos passos recomendados.

---

## 🚀 Principais Funcionalidades

- **Formulário Dinâmico do Cliente (`/`)**: Coleta inicial da demanda trabalhista com validação de dados de contato.
- **Motor de Esclarecimento Automático (`ClarificationEngine`)**: Avalia a completude do relato do cliente e gera até 3 perguntas dinâmicas caso faltem informações essenciais.
- **RAG Jurídico (CLT & TST)**: Busca vetorial no Supabase (`pgvector`) para fundamentação legal precisa e diminuição de alucinações.
- **Painel Administrativo para Advogados (`/admin`)**: Visualização de casos recebidos com status (`pending_clarification`, `ready`, `low_confidence`), resumos gerados, leis aplicáveis e score de confiança.
- **Harness de Avaliação da IA (`Eval Engine`)**: Suíte de testes automatizados em `tests/eval` para medir relevância, taxa de alucinação, robustez e eficácia do esclarecimento.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| **Backend / API** | Next.js Route Handlers (`src/app/api/`), Node.js, Zod (Validação) |
| **Banco de Dados** | Supabase (PostgreSQL) + Extensão `pgvector` |
| **LLM & RAG** | Groq (GroqCloud - Llama), Embeddings para busca vetorial |
| **Testes & Eval** | Vitest, Supertest, Harness de Avaliação próprio (`tests/eval`) |
| **Deploy** | Vercel (Deploy único) |

---

## 📂 Estrutura do Projeto

```
advassist/
├── src/
│   ├── app/                      # Rotas Next.js (Páginas e Route Handlers /api)
│   │   ├── page.tsx              # Form do Cliente
│   │   ├── caso/[id]/page.tsx    # Respostas de esclarecimento
│   │   ├── admin/                # Painel do Advogado (/admin e /admin/[id])
│   │   └── api/                  # Endpoints da API (cases, clarify, admin)
│   ├── frontend/                 # Componentes de UI, hooks e cliente de API
│   │   ├── components/           # Componentes do cliente e do advogado
│   │   └── lib/api.ts            # Client-side API fetch wrapper
│   └── backend/                  # Regra de negócio, RAG, LLM e banco de dados
│       ├── services/
│       │   ├── rag/              # Busca vetorial e ingestão de documentos
│       │   ├── llm/              # Cliente Groq, templates de prompt e engine de esclarecimento
│       │   └── supabase/         # Cliente Supabase Service Role
│       └── lib/validation.ts     # Schemas de validação Zod
├── supabase/
│   └── migrations/               # Scripts SQL de schema e pgvector
├── tests/                        # Testes Unitários, Integração e Eval da IA
│   ├── unit/                     # Testes de unidade
│   ├── integration/              # Testes de integração de API
│   └── eval/                     # Dataset de teste sintético e métricas de IA
└── AdvAssist_Documentacao_Tecnica.md # Documentação técnica detalhada
```

---

## ⚡ Como Executar o Projeto

### 1. Pré-requisitos
- Node.js (v18+ recomendado)
- NPM, Yarn ou PNPM
- Conta no [Supabase](https://supabase.com) com projeto criado e extensão `pgvector` habilitada
- Chave de API da [Groq](https://groq.com)

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com as seguintes chaves:

```env
GROQ_API_KEY=seu_api_key_da_groq
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_do_supabase
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 Testes e Avaliação da IA

### Testes Unitários e de Integração
Para rodar a suíte de testes do Vitest:
```bash
npm test
```

### Harness de Avaliação (Eval Engine)
Para executar a avaliação objetiva da IA contra o dataset sintético de testes trabalhistas e gerar o relatório de métricas:
```bash
npx tsx tests/eval/runEval.ts
```

---

## 🔒 Segurança & Considerações do MVP

- **Isolamento de Chaves**: A `SUPABASE_SERVICE_ROLE_KEY` e a `GROQ_API_KEY` são utilizadas estritamente no lado servidor (`src/backend/`), nunca sendo expostas no navegador.
- **Políticas RLS**: Acesso direto ao Supabase via chave pública anônima é bloqueado; todas as operações trafegam via API interna Next.js.
- **Aviso sobre `/admin`**: Nesta versão MVP, a rota `/admin` não possui camada de autenticação com login/senha.

---

## 📑 Documentação Completa

Para especificações detalhadas de arquitetura, contratos de API, schemas de banco de dados e definições das métricas do Eval, consulte a [Documentação Técnica Completa](AdvAssist_Documentacao_Tecnica.md).

