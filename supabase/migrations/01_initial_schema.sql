-- ========================================================
-- AdvAssist: Schema Inicial do Banco de Dados
-- Supabase Postgres + Extensão pgvector
-- ========================================================

-- 1. Habilitar a extensão vetorial
create extension if not exists vector;

-- 2. Tabela de Casos (Triagem Trabalhista)
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  initial_description text not null,
  status text not null default 'pending_clarification',
    -- Status possíveis: 'pending_clarification' | 'processing' | 'ready' | 'low_confidence'
  legal_summary text,               -- Resumo executivo gerado pela IA
  legal_framing jsonb,              -- Array de normas identificadas: [{"ref": "CLT Art. 3º", "trecho": "..."}]
  next_steps text,                  -- Recomendações de próximos passos jurídicos
  confidence_score numeric(4,3),    -- 0.000 a 1.000
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tabela de Perguntas de Esclarecimento
create table if not exists clarification_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  question_order int not null check (question_order between 1 and 3),
  question_text text not null,
  answer_text text,
  answered_at timestamptz
);

-- 4. Tabela de Documentos Jurídicos (Base de Conhecimento RAG)
-- Dimensão 384 compatível com sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
create table if not exists legal_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,             -- Ex.: "CLT Art. 3º", "Súmula TST 331"
  content text not null,            -- Texto normativo integral ou ementa
  embedding vector(384)             -- Vetor gerado pelo modelo de embeddings
);

-- 5. Tabela de Log de Execuções do Harness de Avaliação (Eval)
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz default now(),
  total_cases int,
  avg_relevance numeric(5,4),
  hallucination_rate numeric(5,4),
  robustness_score numeric(5,4),
  clarification_effectiveness numeric(5,4),
  raw_results jsonb
);

-- ========================================================
-- Índices para Performance e Busca Vetorial
-- ========================================================
create index if not exists idx_cases_status on cases(status);
create index if not exists idx_cases_created_at on cases(created_at desc);
create index if not exists idx_clarification_case_id on clarification_questions(case_id, question_order);

-- Índice vetorial IVFFlat com distância de cosseno
-- (Requer algumas linhas na tabela para ser criado perfeitamente se estiver vazia;
-- usamos índice HNSW se suportado pelo Supabase recente, ou IVFFlat)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_legal_documents_embedding') then
    create index idx_legal_documents_embedding on legal_documents using hnsw (embedding vector_cosine_ops);
  end if;
exception
  when others then
    -- Fallback para ivfflat caso hnsw não esteja disponível na versão local
    create index if not exists idx_legal_documents_embedding on legal_documents using ivfflat (embedding vector_cosine_ops);
end $$;

-- ========================================================
-- Função RPC para Busca Vetorial Semântica (RAG)
-- ========================================================
create or replace function match_legal_documents(
  query_embedding vector(384),
  match_threshold float default 0.25,
  match_count int default 5
)
returns table (
  id uuid,
  source text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    legal_documents.id,
    legal_documents.source,
    legal_documents.content,
    1 - (legal_documents.embedding <=> query_embedding) as similarity
  from legal_documents
  where 1 - (legal_documents.embedding <=> query_embedding) > match_threshold
  order by legal_documents.embedding <=> query_embedding
  limit match_count;
$$;

-- ========================================================
-- Row Level Security (RLS)
-- Como no MVP o frontend não se comunica diretamente com o Supabase,
-- bloqueamos acesso via chave anônima (anon key). O backend utiliza a
-- service_role_key que bypassa o RLS com segurança.
-- ========================================================
alter table cases enable row level security;
alter table clarification_questions enable row level security;
alter table legal_documents enable row level security;
alter table eval_runs enable row level security;

-- Nenhuma política pública criada = nega leitura/escrita para 'anon' por padrão
