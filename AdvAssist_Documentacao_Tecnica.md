# AdvAssist — Documentação Técnica

Triagem inteligente de casos trabalhistas com IA e RAG.
Este documento descreve a arquitetura, o modelo de dados, as rotas de frontend e backend, as histórias de usuário e o harness de avaliação (eval) da IA, com detalhe suficiente para que o projeto seja implementado do zero.

---

## 1. Visão Geral da Arquitetura

O sistema é **um único projeto Next.js, com um único deploy na Vercel**. A separação entre frontend e backend é **de pastas/módulos**, não de projetos ou de deploys:

```
advassist/
├── src/
│   ├── app/        → Next.js App Router — apenas rotas (páginas + endpoints da API)
│   ├── frontend/   → toda a UI: componentes, hooks, lib de chamada à API
│   └── backend/    → toda a lógica de negócio: RAG, LLM, validação, acesso ao Supabase
└── tests/          → testes unitários, de integração e o harness de avaliação (eval)
```

- A pasta `app/` existe porque o Next.js exige esse diretório para o roteamento — mas ela funciona como uma **camada fina**: as páginas em `app/` só importam componentes de `frontend/`, e as rotas de API em `app/api/` só importam e chamam funções de `backend/`. Nenhuma lógica de negócio fica dentro de `app/`.
- O frontend nunca acessa o banco de dados ou o LLM diretamente — ele chama as rotas internas `/api/...` do próprio Next.js (mesmo domínio, sem necessidade de URL externa).
- `backend/` é o único lugar com as chaves sensíveis (Supabase Service Role, Groq API Key) e concentra toda a lógica de RAG, geração de perguntas de esclarecimento e persistência. Essas chaves só existem no lado servidor (Route Handlers), nunca em código que roda no navegador.
- **Banco de dados**: Supabase (Postgres), incluindo a extensão `pgvector` para a busca vetorial do RAG.
- **Não há login/senha nesta fase (MVP)**: o usuário comum acessa a rota raiz `/` para abrir um caso; o advogado acessa a rota `/admin` para ver os casos recebidos. Essa decisão é registrada como uma limitação conhecida do MVP (ver Seção 9 — Segurança).

### 1.1 Diagrama de fluxo (alto nível)

```
[Cliente]              [Next.js — página "/"]        [Next.js — /api/cases]        [Supabase]              [Groq LLM]
   |  preenche formulário     |                            |                            |                       |
   |------------------------->|  POST /api/cases            |                            |                       |
   |                          |--------------------------->|  valida + roda RAG          |                       |
   |                          |                            |--- busca embeddings ------->|                       |
   |                          |                            |<-- trechos da CLT/súmulas ---|                       |
   |                          |                            |------ chama LLM ----------------------------------->|
   |                          |                            |<---- resumo / perguntas ----------------------------|
   |                          |<--- resposta (caso ok ou    |                            |                       |
   |                          |      perguntas extras) -----|                            |                       |
   |<-- exibe perguntas ou ----|                            |                            |                       |
   |    confirmação            |                            |                            |                       |

[Advogado]              [Next.js — página "/admin"]    [Next.js — /api/admin/cases]       |
   |  abre painel              |                            |                            |
   |------------------------->|  GET /api/admin/cases        |                            |
   |                          |--------------------------->|  lê do Supabase              |
   |                          |<--------------------------- |                            |
   |<-- lista + detalhe do ----|                            |                            |
   |    caso (resumo, leis,    |                            |                            |
   |    próximos passos)       |                            |                            |
```

Tudo isso roda dentro do **mesmo projeto Vercel**, numa única URL (ex.: `advassist.vercel.app`), com as páginas servidas pelo Next.js e as rotas `/api/*` executadas como Route Handlers do próprio Next.js (a Vercel roda isso como funções serverless nos bastidores, mas é transparente — continua sendo um único deploy).

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Observações |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript + Tailwind CSS | pasta `src/frontend/` |
| Backend | Next.js Route Handlers (`src/app/api/**/route.ts`), lógica em `src/backend/` | Node.js + TypeScript, roda como serverless functions da Vercel, mas dentro do mesmo deploy |
| Banco de dados | Supabase (Postgres) | Inclui extensão `pgvector` para embeddings do RAG |
| LLM | Groq (GroqCloud), modelo Llama | Compatível com API da OpenAI |
| Embeddings | Modelo de embeddings gratuito/open-weight (ex.: via Groq/HuggingFace) armazenado no Supabase | Usado na busca vetorial do RAG |
| Testes unitários/integração | Vitest (ou Jest) + Supertest | Testam as funções de `backend/` e as rotas `app/api/` |
| Harness de Eval | Script Node/TypeScript próprio em `tests/eval` | Descrito na Seção 8 |
| Deploy | Vercel — **um único projeto** | Root Directory = raiz do repositório |

---

## 3. Estrutura de Pastas Completa

```
advassist/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Rota "/" — formulário do cliente
│   │   ├── caso/[id]/page.tsx             # Rota "/caso/:id" — status/perguntas do caso
│   │   ├── admin/
│   │   │   ├── page.tsx                   # Rota "/admin" — lista de casos recebidos
│   │   │   └── [id]/page.tsx              # Rota "/admin/:id" — detalhe do caso
│   │   └── api/
│   │       ├── cases/
│   │       │   ├── route.ts               # POST /api/cases
│   │       │   └── [id]/
│   │       │       ├── route.ts           # GET /api/cases/:id
│   │       │       └── clarify/route.ts   # POST /api/cases/:id/clarify
│   │       └── admin/
│   │           └── cases/
│   │               ├── route.ts           # GET /api/admin/cases
│   │               └── [id]/route.ts      # GET /api/admin/cases/:id
│   │
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── cliente/
│   │   │   │   ├── FormularioCaso.tsx
│   │   │   │   ├── PerguntasEsclarecimento.tsx
│   │   │   │   └── ConfirmacaoEnvio.tsx
│   │   │   └── advogado/
│   │   │       ├── ListaCasos.tsx
│   │   │       ├── CartaoCaso.tsx
│   │   │       └── DetalheCaso.tsx
│   │   └── lib/
│   │       └── api.ts                     # wrapper de fetch para "/api/..." (mesmo domínio)
│   │
│   └── backend/
│       ├── services/
│       │   ├── rag/
│       │   │   ├── retrieve.ts            # busca vetorial no Supabase (pgvector)
│       │   │   └── knowledgeBase.ts       # ingestão da base de CLT/súmulas
│       │   ├── llm/
│       │   │   ├── groqClient.ts          # cliente da API do Groq
│       │   │   ├── promptTemplates.ts     # prompts (resumo, enquadramento, próximos passos, perguntas)
│       │   │   └── clarificationEngine.ts # decide se faz até 3 perguntas extras
│       │   └── supabase/
│       │       └── client.ts              # cliente Supabase (service role, uso só no backend)
│       └── lib/
│           └── validation.ts              # validação de payloads (zod)
│
├── tests/
│   ├── unit/
│   │   ├── validation.test.ts
│   │   ├── clarificationEngine.test.ts
│   │   └── promptTemplates.test.ts
│   ├── integration/
│   │   ├── cases.api.test.ts
│   │   └── admin.api.test.ts
│   └── eval/
│       ├── dataset/
│       │   └── casos_teste.json           # casos sintéticos + gabarito esperado
│       ├── runEval.ts                     # script que executa o harness
│       └── metrics.ts                     # cálculo de relevância, alucinação, robustez
│
├── .env.local                             # todas as variáveis de ambiente (Seção 9)
└── package.json                           # um único package.json para o projeto inteiro
```

---

## 4. Modelo de Dados (Supabase / Postgres)

```sql
-- Extensão necessária para RAG
create extension if not exists vector;

-- Casos enviados pelos clientes
create table cases (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  initial_description text not null,
  status text not null default 'pending_clarification',
    -- valores: 'pending_clarification' | 'processing' | 'ready' | 'low_confidence'
  legal_summary text,               -- resumo gerado pela IA
  legal_framing jsonb,              -- leis/súmulas identificadas, ex.: [{"ref": "CLT Art. 59", "trecho": "..."}]
  next_steps text,                  -- sugestão de próximos passos jurídicos
  confidence_score numeric,         -- 0 a 1, usado para marcar "low_confidence"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Perguntas de esclarecimento (até 3 por caso) e respostas do cliente
create table clarification_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  question_order int not null check (question_order between 1 and 3),
  question_text text not null,
  answer_text text,
  answered_at timestamptz
);

-- Base de conhecimento jurídico (CLT, súmulas do TST) para o RAG
create table legal_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,             -- ex.: "CLT", "Súmula TST 291"
  content text not null,
  embedding vector(384)             -- dimensão depende do modelo de embeddings escolhido
);

-- Log de execuções do harness de avaliação (eval)
create table eval_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz default now(),
  total_cases int,
  avg_relevance numeric,
  hallucination_rate numeric,
  robustness_score numeric,
  clarification_effectiveness numeric,
  raw_results jsonb
);
```

> Índice vetorial recomendado: `create index on legal_documents using ivfflat (embedding vector_cosine_ops);`

> Como não há autenticação de usuários no MVP, o RLS (Row Level Security) deve ser configurado para **bloquear leitura/escrita direta via chave anônima** em todas as tabelas acima — todo o acesso passa exclusivamente pelo backend usando a `service role key` (ver Seção 9).

---

## 5. Frontend (`src/frontend/`)

### 5.1 Usuário comum (rota `/`)

**Fluxo de telas:**
1. `/` — Formulário: nome, e-mail, telefone, descrição livre da demanda.
2. Após o envio, se o backend indicar que faltam informações → tela de **perguntas de esclarecimento** (até 3, uma de cada vez ou em lista, a critério da implementação).
3. Tela final de **confirmação de envio** ("Seu caso foi recebido, em breve um advogado entrará em contato").

**Componentes:**
- `FormularioCaso.tsx`: campos controlados + validação básica (nome, e-mail, telefone, texto da demanda).
- `PerguntasEsclarecimento.tsx`: renderiza as perguntas retornadas pelo backend e envia as respostas.
- `ConfirmacaoEnvio.tsx`: tela de sucesso.

**Histórias de usuário:**

- **US1** — Como cliente, quero preencher meus dados de contato e descrever minha situação de trabalho, para que um advogado possa avaliar meu caso.
- **US2** — Como cliente, quero responder a perguntas adicionais quando meu relato estiver incompleto, para que a triagem do meu caso seja mais precisa.
- **US3** — Como cliente, quero ver uma confirmação clara de que meu caso foi enviado, para saber que fui atendido e não precisar reenviar.
- **US4** — Como cliente, quero entender que estou falando com uma triagem automatizada e não com um advogado humano, para ter expectativas corretas sobre o atendimento.

### 5.2 Advogado (rota `/admin`)

**Fluxo de telas:**
1. `/admin` — Lista de casos recebidos (cartões com nome do cliente, status e data).
2. `/admin/:id` — Detalhe do caso: relato original, respostas às perguntas de esclarecimento, resumo gerado pela IA, enquadramento legal sugerido e próximos passos.

**Componentes:**
- `ListaCasos.tsx`: lista/tabela de casos, com filtro por status (`pending_clarification`, `ready`, `low_confidence`).
- `CartaoCaso.tsx`: item individual da lista.
- `DetalheCaso.tsx`: exibição completa do caso processado.

**Histórias de usuário:**

- **US5** — Como advogado, quero acessar uma lista dos casos recebidos em `/admin`, para priorizar meu atendimento.
- **US6** — Como advogado, quero ver o resumo do caso, o enquadramento legal sugerido e os próximos passos, para decidir rapidamente como agir.
- **US7** — Como advogado, quero ver o relato original do cliente junto com as respostas às perguntas de esclarecimento, para entender todo o contexto sem perder informação.
- **US8** — Como advogado, quero identificar quando um caso ficou com `confidence_score` baixo (`low_confidence`), para saber que preciso revisar manualmente com mais atenção.

---

## 6. Backend — Endpoints da API (`src/app/api/` chamando `src/backend/`)

Cada rota abaixo é um Route Handler do Next.js (`route.ts`), que apenas valida a entrada e delega para as funções de `src/backend/services/`.

### `POST /api/cases`
Cria um novo caso a partir do formulário do cliente.

**Request body:**
```json
{
  "client_name": "string",
  "client_email": "string",
  "client_phone": "string",
  "initial_description": "string"
}
```

**Lógica:**
1. Valida o payload (`backend/lib/validation.ts`).
2. Insere o caso na tabela `cases` com `status = 'processing'`.
3. Chama `clarificationEngine.ts`, que usa o LLM para avaliar se `initial_description` é suficiente.
   - Se **insuficiente**: gera até 3 perguntas, salva em `clarification_questions`, muda `status` para `pending_clarification` e retorna as perguntas ao frontend.
   - Se **suficiente**: roda o pipeline de RAG + geração de resumo diretamente (mesma lógica do endpoint de `clarify`, Seção 6.2) e marca `status = 'ready'`.

**Response (quando faltam informações):**
```json
{
  "case_id": "uuid",
  "status": "pending_clarification",
  "questions": [
    { "order": 1, "text": "Há subordinação e horário fixo definido pela empresa?" },
    { "order": 2, "text": "Há exclusividade na prestação do serviço?" },
    { "order": 3, "text": "Há quanto tempo essa relação de trabalho ocorre?" }
  ]
}
```

**Response (quando já é suficiente):**
```json
{ "case_id": "uuid", "status": "ready" }
```

### `POST /api/cases/:id/clarify`
Recebe as respostas às perguntas de esclarecimento e finaliza o processamento do caso.

**Request body:**
```json
{
  "answers": [
    { "order": 1, "text": "Sim, tenho horário fixo e recebo ordens diretas." },
    { "order": 2, "text": "Sim, trabalho só para essa empresa." },
    { "order": 3, "text": "Há 8 meses." }
  ]
}
```

**Lógica:**
1. Salva as respostas em `clarification_questions`.
2. Monta o contexto completo (relato inicial + perguntas + respostas).
3. Executa o pipeline de RAG (`backend/services/rag/retrieve.ts`): busca por similaridade vetorial em `legal_documents`.
4. Chama o Groq (`backend/services/llm/groqClient.ts`) com um prompt que combina o contexto do caso + os trechos legais recuperados, pedindo: resumo estruturado, enquadramento legal (CLT/súmulas) e sugestão de próximos passos.
5. Calcula um `confidence_score` (ex.: baseado na confiança retornada pelo próprio LLM ou heurística de completude do contexto).
6. Atualiza o caso: `legal_summary`, `legal_framing`, `next_steps`, `confidence_score`, `status = 'ready'` (ou `'low_confidence'` se o score for baixo).

**Response:**
```json
{ "case_id": "uuid", "status": "ready" }
```

### `GET /api/cases/:id`
Retorna o status atual de um caso (usado pela tela do cliente para saber se ainda está em processamento).

### `GET /api/admin/cases`
Lista todos os casos, com paginação e filtro opcional por `status`. Usado pela tela `/admin`.

### `GET /api/admin/cases/:id`
Retorna o caso completo (relato original, perguntas/respostas, resumo, enquadramento legal, próximos passos, `confidence_score`). Usado pela tela `/admin/:id`.

---

## 7. Testes (pasta `tests/`)

### 7.1 Testes unitários
Cobrem funções puras e isoladas de `src/backend/`, sem tocar no banco de dados real:
- `validation.test.ts`: valida que payloads incompletos ou malformados são rejeitados.
- `clarificationEngine.test.ts`: dado um relato curto (ex.: o exemplo "PJ vs. CLT"), verifica se o motor decide corretamente gerar perguntas; dado um relato completo, verifica que não gera perguntas desnecessárias.
- `promptTemplates.test.ts`: garante que os templates de prompt incluem os campos obrigatórios (contexto, pergunta, instrução de formato de saída).

### 7.2 Testes de integração
Sobem a aplicação Next.js localmente (ou usam um ambiente de teste do Supabase) e testam o fluxo ponta a ponta através das rotas `app/api/`:
- `cases.api.test.ts`: `POST /api/cases` com relato incompleto deve retornar `pending_clarification` e perguntas; com relato completo deve retornar `ready` diretamente; `POST /api/cases/:id/clarify` deve atualizar o status do caso corretamente.
- `admin.api.test.ts`: `GET /api/admin/cases` deve listar os casos criados; `GET /api/admin/cases/:id` deve retornar o resumo e o enquadramento legal.

**Ferramentas:** Vitest (ou Jest) + Supertest para simular requisições HTTP contra as rotas do Next.js.

---

## 8. Harness de Avaliação (Eval) do Componente de IA

O eval é um script separado, independente da aplicação em produção, criado para medir a qualidade da IA de forma objetiva e repetível — essencial tanto para o desenvolvimento quanto para a entrega C2/C3 do Projeto Integrador.

### 8.1 Dataset de teste (`tests/eval/dataset/casos_teste.json`)
Um conjunto de casos sintéticos, cobrindo os tipos de demanda trabalhista priorizados (verbas rescisórias, horas extras, assédio moral, "pejotização"/PJ-CLT, etc.), cada um com um **gabarito** (resposta esperada):

```json
[
  {
    "id": "caso_01",
    "descricao_inicial": "Estou trabalhando com PJ mas na prática atuo como CLT",
    "espera_perguntas_esclarecimento": true,
    "enquadramento_esperado": ["CLT Art. 3º", "Súmula 331 TST"],
    "proximos_passos_esperados_contendo": ["reconhecimento de vínculo empregatício"]
  },
  {
    "id": "caso_02",
    "descricao_inicial": "Fui demitido sem justa causa há 2 meses e a empresa não pagou minhas verbas rescisórias nem o FGTS",
    "espera_perguntas_esclarecimento": false,
    "enquadramento_esperado": ["CLT Art. 477"],
    "proximos_passos_esperados_contendo": ["prazo para pagamento das verbas rescisórias"]
  }
]
```

### 8.2 Métricas calculadas (`tests/eval/metrics.ts`)

| Métrica | Como é calculada |
|---|---|
| **Relevância** | Similaridade semântica (embeddings) ou "LLM-as-judge" (um segundo prompt pede ao LLM para pontuar de 0 a 1 o quanto o resumo gerado corresponde ao caso). |
| **Taxa de erro/alucinação** | Verifica se cada lei/súmula citada pela IA existe de fato na base `legal_documents` (evita citação inventada) e se está entre as esperadas no gabarito. |
| **Robustez** | Roda variações do mesmo caso (relato reduzido, com erros de digitação, fora de ordem) e mede se o resultado final permanece consistente. |
| **Eficácia do mecanismo de esclarecimento** | Compara a qualidade do resumo gerado **sem** perguntas extras vs. **com** as respostas às perguntas, para casos que deveriam ter acionado o mecanismo — mede se o esclarecimento realmente melhora a saída. |

### 8.3 Execução (`tests/eval/runEval.ts`)
Script Node/TypeScript que:
1. Lê `casos_teste.json`.
2. Para cada caso, chama a aplicação Next.js localmente (ou em staging) exatamente como um cliente real faria (`POST /api/cases`, e se houver perguntas, `POST /api/cases/:id/clarify` com respostas simuladas).
3. Compara a saída real com o gabarito, calculando as métricas da Seção 8.2.
4. Grava o resultado consolidado na tabela `eval_runs` (Seção 4) e também em um relatório local (`tests/eval/report.json`), permitindo comparar a evolução da qualidade da IA entre execuções (por exemplo, entre C2 e C3).

**Recomendação:** rodar o `runEval.ts` a cada mudança relevante nos prompts ou na base de conhecimento (`legal_documents`), documentando os números no repositório GitHub, conforme exigido no edital da disciplina.

---

## 9. Segurança e Considerações (MVP)

- **Rota `/admin` sem autenticação**: decisão consciente para o MVP. Fica registrado como limitação conhecida — antes de qualquer uso com dados reais fora do ambiente acadêmico, recomenda-se, no mínimo, proteger a rota com uma variável de ambiente compartilhada (ex.: um token simples enviado por header) e, no médio prazo, migrar para autenticação real.
- **LGPD**: dados pessoais (`client_name`, `client_email`, `client_phone`) e o relato do caso são armazenados no Supabase; o RLS deve impedir que a `anon key` leia a tabela `cases` diretamente — todo o acesso a dados sensíveis passa exclusivamente pelas rotas `app/api/`, usando a `service role key` (que existe apenas no lado servidor, nunca é enviada ao navegador).
- **Prompt injection**: o campo `initial_description` é texto livre; os prompts em `promptTemplates.ts` devem isolar claramente as instruções do sistema do conteúdo do usuário (delimitadores explícitos) para reduzir o risco de manipulação do modelo.
- **Variáveis de ambiente** (um único `.env.local`, nunca commitado):

| Variável | Onde é usada |
|---|---|
| `GROQ_API_KEY` | `src/backend/` (lado servidor apenas) |
| `SUPABASE_URL` | `src/backend/` |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/backend/` (acesso total, uso interno, nunca exposta ao navegador) |
| `SUPABASE_ANON_KEY` | opcional, só se algum dia o frontend precisar falar direto com o Supabase |

> Como frontend e backend estão no mesmo projeto, **não existe mais** a variável `NEXT_PUBLIC_API_BASE_URL` — o frontend chama as rotas relativas (`/api/cases`, `/api/admin/cases`) no mesmo domínio.

---

## 10. Deploy (Vercel)

- **Um único projeto Vercel**, apontando para a raiz do repositório (Root Directory = `.`).
- Um único conjunto de variáveis de ambiente, configurado uma vez no painel do projeto.
- O Next.js serve as páginas (`/`, `/admin`, etc.) e as rotas de API (`/api/*`) a partir do mesmo build — a Vercel identifica automaticamente os Route Handlers e os executa como funções serverless, sem nenhuma configuração adicional (`vercel.json` não é necessário para esse caso padrão).
- O banco de dados (Supabase) é externo e acessado apenas pelas rotas de `src/backend/`, nunca pelo navegador do cliente.

---

## 11. Ordem sugerida de implementação

1. Criar o schema no Supabase (Seção 4) e habilitar `pgvector`.
2. Popular `legal_documents` com um recorte inicial da CLT e súmulas do TST (com embeddings).
3. Implementar `src/backend/`: validação → `clarificationEngine` → RAG → integração com Groq.
4. Escrever os testes unitários e de integração antes de ligar as telas.
5. Criar as rotas de API em `src/app/api/`, ligando-as às funções de `backend/`.
6. Implementar o frontend (`/` e `/admin`) consumindo as rotas `/api/...` já testadas.
7. Construir o harness de eval e rodar contra o dataset de teste.
8. Deploy do projeto único na Vercel e testes manuais ponta a ponta.
